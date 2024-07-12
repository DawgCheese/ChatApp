const express = require('express');
const bcryptjs = require('bcryptjs')
const jwb = require('jsonwebtoken');
const cors = require('cors');
const io = require('socket.io')(8080,{
    cors: {
        origin: 'http://localhost:3001',
    }
});

// Connect db
require('./db/connection');

// Import File
const Users = require('./models/Users');
const Conversations = require('./models/Conversations');
const Messages = require('./models/Messages');

//app use
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended:false}));
app.use(cors());

const port = process.env.PORT || 3000;

//Socket.io
let users=[];
io.on('connection',socket =>{
    console.log('connection',socket.id);
    socket.on('addUser',userId =>{
        const isUserExist = users.find(user => user.userId === userId);
        if(!isUserExist){
            const user ={userId, socketId: socket.id};
            users.push(user);
            io.emit('getUsers',users);
        }
    });

    socket.on('sendMessage', async ({senderId,receiverId,message,conversationId}) => {
        const receiver = users.find(user => user.userId === receiverId);
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);
        console.log('sender:>>',sender,receiver);
        if(receiver){
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage',{
                senderId,
                message,
                conversationId,
                receiverId,
                user:{ id: user._id , fullName: user.fullName, name: user.name }
            });
        }else{      
            io.to(sender.socketId).emit('getMessage',{
                senderId,
                message,
                conversationId,
                receiverId,
                user:{ id: user._id , fullName: user.fullName, name: user.name }
            });
        }
    });

    socket.on('disconnect',() =>{
        users = users.filter(user => user.socketId !== socket.Id);
        io.emit('getUsers',users);
    });
    // io.emit('getUsers',socket.userId);
});

//Routes
app.get('/', (req,res) =>{
    res.send('Welcoem');
})

app.post('/api/register',async (req,res, next)=>{
    try {
        const{fullName , name , password} = req.body;

        if(!fullName || !name || !password){
            res.status(400).send('Please fill all required fields 1')
        }else{
            const isAlreadyExist = await Users.findOne({name});
            if(isAlreadyExist){
                res.status(400).send('User aldready exists');
            }else{
                const newUser = new Users({fullName,name});
                bcryptjs.hash(password,10,(err,hashedPassword) =>{
                    newUser.set('password',hashedPassword);
                    newUser.save();
                    next();
                })
                return res.status(200).send('User registered successfully');
            }
        }
    } catch (error) {
        console.log(error,'Error')
    }
})

app.post('/api/login', async(req,res, next) =>{
    try {
        const {name, password } = req.body;
        if( !name || !password){
            res.status(400).send('Please fill all required fields 2');
        }else{
            const user = await Users.findOne({ name });
            if(!user){
                res.status(400).send('User email or password is incorrect');
            }else{
                const validateUser = await bcryptjs.compare(password, user.password);
                if(!validateUser){
                    res.status(400).send('User email or password is incorrect');
                }else{
                    const payload ={
                        userId: user._id,
                        name: user.name
                    }
                    const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'THIS_IS_A_JWT_SECRET_KEY';    
                    
                    jwb.sign(payload,JWT_SECRET_KEY,{ expiresIn: 84600}, async (err, token) =>{
                        await Users.updateOne({_id: user._id},{
                            $set:{ token}
                        })
                        user.save();
                        return res.status(200).json({ user: {id:user._id,name: user.name, fullName:user.fullName},
                            token:token })
                    })
                    
                }
            }
        }
    } catch (error) {
        console.log(error,'Error')
    }
})

app.post('/api/conversation', async( req,res)=>{
    try {
        const {senderId,receiverId} = req.body;
        const newCoversation = new Conversations({members:[senderId,receiverId]});
        await newCoversation.save();
        res.status(200).send('Conversation created successfully');
    } catch (error) {
        console.log(error,'Error')
    }
})
app.get('/api/conversations/:userId', async (req,res) =>{
    try {
        const userId = req.params.userId;
        const conversations = await Conversations.find({members: { $in: [userId] } });
        const conversationUserData = Promise.all(conversations.map(async (conversation)=>{
            const receiverId =  conversation.members.find((member) => member !==userId);
            const user = await Users.findById(receiverId);
            return {user:{receiverId: user._id,name: user.name, fullName: user.fullName}, conversationId: conversation._id}
            
        }))
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.log(error,'Error')
    }
})
app.post('/api/message',async (req,res) =>{
    try {
        const{ conversationId, senderId , message, receiverId =''} = req.body;
        if( !senderId || !message) return res.status(200).send('Please fill all required fields 3')
        if(conversationId ==='new' && receiverId){
            const newCoversation = new Conversations({members:[senderId,receiverId]});
            await newCoversation.save();
            const newMessage = new Messages({ conversationId: newCoversation._id, senderId, message});
            await newMessage.save();
            return res.status(200).send('Message sent successfully')
        }else if(!conversationId && !receiverId){
            return res.status(400).send('Please fill all required fields 4')
        }
        const newMessage = new Messages({conversationId,senderId,message});
        await newMessage.save();
        res.status(200).send('Message sent successfully');
    } catch (error) {
        console.log(error,'Error')
    }
})

app.get('/api/message/:conversationId', async (req,res) =>{
    try {
        const checkMessages =  async (conversationId) =>{
            const messages = await Messages.find({conversationId });
            const messageUserData = Promise.all(messages.map( async (message)=>{
                const user = await Users.findById(message.senderId);
                return {user:{id:user._id, name: user.name, fullName: user.fullName}, message:message.message}
            }));
            res.status(200).json(await messageUserData);
        }
        const conversationId = req.params.conversationId;
        if(conversationId ==='new'){
            const checkConversation = await Conversations.find({ members:{ $all: [req.query.senderId, req.query.receiverId] } });
            if(checkConversation.length >0){
               checkMessages(checkConversation[0]._id);
            }else{
                return res.status(200).json([])
            }
        } else{
            checkMessages(conversationId);
        }
    } catch (error) {
        console.log(error,'Error')
        
    }
})
app.get('/api/users/:userId',async(req,res) =>{
    try {
        const userId = req.params.userId;
        const users = await Users.find({ _id: { $ne: userId}});
        const usersData = Promise.all(users.map( async (user)=>{
            return {user:{name: user.name, fullName: user.fullName , receiverId: user._id}}

        }))
        res.status(200).json(await usersData);
    } catch (error) {
        console.log(error,'Error')
    }
})
app.listen(port,()=>{
    console.log('listening on port' +port);
})

