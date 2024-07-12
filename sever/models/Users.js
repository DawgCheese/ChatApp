const mongoose = require('mongoose')

const userShema = mongoose.Schema({
    fullName:{
        type:String,
        require:true,
    },
    name:{
        type:String,
        require:true,
    },
    password:{
        type:String,
        require:true,
    },
    token:{
        type:String
    }
});
 
const Users = mongoose.model('User',userShema);

module.exports = Users;