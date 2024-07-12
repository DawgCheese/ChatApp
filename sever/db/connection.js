const mongoose = require('mongoose');

const url =`mongodb+srv://Chat_App_Admin:khoa123456@cluster0.rpphasc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

mongoose.connect(url,{
    useNewUrlParser: true,
     useUnifiedTopology: true
}).then(()=> console.log('Connected to DB')).catch((e)=> console.log('Error',e))
