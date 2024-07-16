const express = require('express'); // Khung để xây dựng web application Node.js.
const bcryptjs = require('bcryptjs') // Mã hóa mật khẩu 
const jwb = require('jsonwebtoken');
const cors = require('cors');
//xây dựng tính năng chat thời gian thực
//Khởi tạo một server socket.io trên cổng 8080.
const io = require('socket.io')(8080,{
    cors: {
        origin: 'http://localhost:3001',//Cors để cho phép kết nối từ http://localhost:3001
    }
});

// Connect db
require('./db/connection');

// Import File từ models
const Users = require('./models/Users');
const Conversations = require('./models/Conversations');
const Messages = require('./models/Messages');

//app use
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended:false}));
app.use(cors());

//Khai biến cổng nếu có không thì mặc định 3000
const port = process.env.PORT || 3000;

//Socket.io
let users=[];
io.on('connection',socket =>{
    console.log('connection',socket.id);// In ra bảng thông báo ở teminal khi có kết nối socket.io
    socket.on('addUser',userId =>{
        const isUserExist = users.find(user => user.userId === userId); //find: hàm kiểm tra người dùng đã có trong mảng ch
        if(!isUserExist){  // Nếu chưa có 
            const user ={userId, socketId: socket.id};// Tạo đối tượng với 2 thuộc tính userId và socketId
            users.push(user); // push : hàm thêm đối tượng vào user
            io.emit('getUsers',users); // io.emit cập nhật danh sách users
        }
    });

     //Gửi tới sendMessage với thông tin tin nhắn(Id gửi tin,Id người nhận,tin nhắn, id cuộc trò chuyện)
    socket.on('sendMessage', async ({senderId,receiverId,message,conversationId}) => { 
        // TÌm đối tượng dựa vào Id của họ và sử dụng hàm findById để truy xuất các dữ liệu thông tin người gửi từ CSDL
        const receiver = users.find(user => user.userId === receiverId);               
        const sender = users.find(user => user.userId === senderId);
        const user = await Users.findById(senderId);
        if(receiver){// Nếu có người nhận
            // Chọn socket của cả 2 người gửi và nhận sau đó  emit getMessage đến cả 2 để gửi tin nhắn cùng 1 lúc
            // emit dùng để phát sự kiện từ server đến các client đã kết nối
            io.to(receiver.socketId).to(sender.socketId).emit('getMessage',{
                senderId,// Id người gửi
                message,// Rin nhắn
                conversationId,//Id cuộc trò chuyện
                receiverId,// Id người nhận 
                user:{ id: user._id , fullName: user.fullName, name: user.name }//User đối tượng từ DataBase gồm Id fullName và name 
            });
            }else{      
                //Nuế không có người nhận
                //Chọn người gửi dùng emit để kết nối getMessage đén socket bằng emit
                io.to(sender.socketId).emit('getMessage',{
                    senderId,
                    message,
                    conversationId,
                    receiverId,
                    user:{ id: user._id , fullName: user.fullName, name: user.name }
                });
        }
    });

    socket.on('disconnect', () => {
        // Xóa người dùng khỏi danh sách người dùng trực tuyến bằng hàm filter đối với user ngắt kết nối
        users = users.filter(user => user.socketId !== socket.id);
        io.emit('usersUpdated', users); // Phát sự kiện để cập nhật danh sách người dùng
    });
    // io.emit('getUsers',socket.userId);
});

//Routes
app.get('/', (req,res) =>{
    res.send('Welcoem');
})
// Đăng ký
app.post('/api/register',async (req,res, next)=>{
    try {
        // Lấy thông tin người dùng từ body của yêu cầu
        const{fullName , name , password} = req.body;
        // Kiểm tra đã điền đủ vào form
        if(!fullName || !name || !password){
            res.status(400).send('Vui lòng điền đầy đủ các trường bắt buộc')
        }else{
            // Kiểm tra người dùng hiện có cùng tên đăng nhập đã có
            const isAlreadyExist = await Users.findOne({name});
            if(isAlreadyExist){
                res.status(400).send('Tên đăng nhập đã tồn tại');
            }else{
                //Tạo một đối tượng người dùng mới với fullName và name
                const newUser = new Users({fullName,name});
                //Mã hóa mật khẩu để an toàn khi lưu vào DB
                bcryptjs.hash(password,10,(err,hashedPassword) =>{
                    newUser.set('password',hashedPassword); // Thiết lập mật khẩu
                    newUser.save(); // Lưu vào cơ sở dữ liệu
                    next();
                })
                return res.status(200).send('Đăng ký thành công');
            }
        }
    } catch (error) {
        console.log(error,'Error')
    }
})
// Đăng nhập
app.post('/api/login', async(req,res, next) =>{
    try {
        const {name, password } = req.body;// Lấy name và password từ body
        if( !name || !password){ // Kiểm tra xem cả name và password và yêu cầu phải điền đầy đủ
            res.status(400).send('Vui lòng điền đầy đủ các trường bắt buộc ');
        }else{
            const user = await Users.findOne({ name });//findOne sử dụng để tìm kiếm duy nhất 1 Users có chứ name 
            if(!user){//Kiểm tra user có tồn tại
                res.status(400).send('Tài khoản hoặc mật khẩu không chính xác');
            }else{
                //validateUser là kết quả của so sánh đúng hay sai của hàm compare
                //bcryptjs.compare dùng để so sánh mật khẩu vừa nhập và mật khẩu đã mã hóa có giống nhau
                const validateUser = await bcryptjs.compare(password, user.password);
                if(!validateUser){// Nếu sai
                    res.status(400).send('Tài khoản hoặc mật khẩu không chính xác');
                }else{// Nếu đúng
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
// Tạo cuộc trò chuyện
app.post('/api/conversation', async( req,res)=>{
    try {
        // Lấy ID người gửi và người nhận từ body 
        const {senderId,receiverId} = req.body;
        // Tạo cuộc trò chuyện mới 
        const newCoversation = new Conversations({members:[senderId,receiverId]});
        // Lưu vào database
        await newCoversation.save();
        res.status(200).send('Tạo hội thoại thành công');
    } catch (error) {
        console.log(error,'Error')
    }
})
// Lấy danh sách cuộc trò chuyện
app.get('/api/conversations/:userId', async (req,res) =>{
    try {
        const userId = req.params.userId; // Lấy ID người dùng 
        const conversations = await Conversations.find({members: { $in: [userId] } }); // Tìm kiếm các trò chuyện có chứa ID người dùng bằng find
        const conversationUserData = Promise.all(conversations.map(async (conversation)=>{ // Lấy thông tin chi tiết người nhận
            const receiverId =  conversation.members.find((member) => member !==userId);
            const user = await Users.findById(receiverId); // Lấy thông tin chi tiết của người nhận
            return {user:{receiverId: user._id,name: user.name, fullName: user.fullName}, conversationId: conversation._id}
            
        }))
        res.status(200).json(await conversationUserData);
    } catch (error) {
        console.log(error,'Error')
    }
})
// Gửi tin nhắn
app.post('/api/message',async (req,res) =>{
    try {
        const{ conversationId, senderId , message, receiverId =''} = req.body; // Lấy thông tin tin nhắn từ body
        if( !senderId || !message) return res.status(200).send('Vui lòng điền đầy đủ các trường bắt buộc')
        if(conversationId ==='new' && receiverId){//Gửi tin nhắn trong trò chuyện mới
            const newCoversation = new Conversations({members:[senderId,receiverId]}); // Tạo cuộc trò chuyện mới
            await newCoversation.save(); // Lưu
            const newMessage = new Messages({ conversationId: newCoversation._id, senderId, message});// Tạo tin nhắn mới
            await newMessage.save();// Lưu
            return res.status(200).send('Tin nhắn đã được gửi')
        }else if(!conversationId && !receiverId){
            return res.status(400).send('Vui lòng điền đầy đủ các trường bắt buộc')
        }
        const newMessage = new Messages({conversationId,senderId,message});// Gửi tin nhắn trong cuộc trò chuyện đã có
        await newMessage.save();
        res.status(200).send('Tin nhắn đã được gửi');
    } catch (error) {
        console.log(error,'Error')
    }
})
// Lấy tin nhắn
app.get('/api/message/:conversationId', async (req,res) =>{
    try {
        const checkMessages =  async (conversationId) =>{ // Hàm lấy danh sách tin nhắn theo ID 
            const messages = await Messages.find({conversationId });// Tìm kiếm các tin nhắn trong cuộc trò chuyện
            const messageUserData = Promise.all(messages.map( async (message)=>{//Lấy thông tin chi tiết người gửi cho từng tin nhắn
                const user = await Users.findById(message.senderId);
                return {user:{id:user._id, name: user.name, fullName: user.fullName}, message:message.message}
            }));
            res.status(200).json(await messageUserData);
        }
        const conversationId = req.params.conversationId;
        if(conversationId ==='new'){ // Kiểm tra cuộc tro chuyện mới
            const checkConversation = await Conversations.find({ members:{ $all: [req.query.senderId, req.query.receiverId] } });
            if(checkConversation.length >0){// Nếu tìm thấy hội thoại khớp
               checkMessages(checkConversation[0]._id);// checkConversation[0]._id để lấy danh sách tin nhắn của cuộc trò chuyện đó.
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
        const userId = req.params.userId; // Lấy ID người dùng
        const users = await Users.find({ _id: { $ne: userId}});// Tìm kiếm tất cả người dùng $ne: không khớp
        const usersData = Promise.all(users.map( async (user)=>{ // Lấy thông tin cần thiết của người dùng
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

