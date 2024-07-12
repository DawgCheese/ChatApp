import Input from "../../compoments/Input"
import Button from "../../compoments/Button"
import { useState } from "react"
import { useNavigate } from "react-router-dom"


const Form = ({
    isSignInPage = true,
}) =>{
    const[data,setData] = useState({
        ...(!isSignInPage &&{
            fullName:''
        }),
        name:'',
        password:''
    })
    const navigate = useNavigate()
    const handleSubmit = async (e) =>{
        console.log('data :>>',data);
        e.preventDefault()
        const res  = await fetch(`http://localhost:3000/api/${isSignInPage ?'login':'register'}`,{
            method:'POST',
            headers:{
                'Content-Type':'application/json'
            },
            body: JSON.stringify(data)
        })
        if(res.status ===400){
            alert('Invalid credentials')
        }else{
            const resData = await res.json()
        if(resData.token){
            localStorage.setItem('user:token',resData.token)
            localStorage.setItem('user:detail',JSON.stringify(resData.user))
            navigate('/')
        }
        }
    }
    return(
        <div className="bg-light h-screen flex items-center justify-center">
        <div className="bg-secondary w-[500px] h-[700px] shadow-lg rounded-lg flex flex-col justify-center items-center">
            <div className="text-3xl font-extrabold">Welcome{isSignInPage && 'Back'}</div>
            <div className="text-xl font-light mb-14">{isSignInPage ? 'Đăng nhập để khám phá':'Đăng kí để bắt đầu'}</div>
            <form className="flex flex-col items-center w-full" onSubmit={(e)=>handleSubmit(e)}>
            {!isSignInPage && <Input label="Họ và tên:" name="name" placeholder="Nhập họ và tên" className="mb-6 w-[75%]"
            value={data.fullName} onChange={(e) => setData({...data, fullName: e.target.value}) }/> }
            <Input label="Tên đăng nhập:" type="name"  name="name" placeholder="Nhập tên đăng nhập" className="mb-6 w-[75%]" 
            value={data.name} onChange={(e) => setData({...data, name: e.target.value}) }/>
            <Input label="Mật khẩu:" type="password" name="password" placeholder="Nhập mật khẩu" className="mb-14 w-[75%]"
            value={data.password} onChange={(e) => setData({...data, password: e.target.value}) }/>
            <Button label={isSignInPage ?  'Đăng nhập' : 'Đăng ký'} type='sumbit' className="w-[75%] mb-2"/>
            </form>
            <div>{ isSignInPage ? 'Bạn không có tài khoản?':'Bạn đã có tài khoản' }<span className="text-primary cursor-pointer underline"
            onClick={()=> navigate(`/users/${isSignInPage?'sign_up':'sign_in'}`)}>{isSignInPage ?'Đăng kí':'Đăng nhập'}</span></div>
        </div>
        </div>
    )
}
export default Form
