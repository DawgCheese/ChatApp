import React, { useEffect, useRef, useState } from 'react'
import Avatar from '../../assets/Avatar.png'
import Input from '../../compoments/Input'
import { io } from 'socket.io-client'

const Dashboard = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user:detail')))
	const [conversations, setConversations] = useState([])
	const [messages, setMessages] = useState({})
	const [message, setMessage] = useState('')
	const [users, setUsers] = useState([])
	const [socket, setSocket] = useState(null)
	const messageRef = useRef(null)

	useEffect(() => {
		setSocket(io('http://localhost:8080'))
	}, [])

	useEffect(() => {
		socket?.emit('addUser', user?.id);
		socket?.on('getUsers', users => {
			console.log('activeUsers :>> ', users);
		})
		socket?.on('getMessage', data => {
			setMessages(prev => ({
				...prev,
				messages: [...prev.messages, { user: data.user, message: data.message }]
			}))
		})
	}, [socket])

	useEffect(() => {
		messageRef?.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages?.messages])

	useEffect(() => {
		const loggedInUser = JSON.parse(localStorage.getItem('user:detail'))
		const fetchConversations = async () => {
			const res = await fetch(`http://localhost:3000/api/conversations/${loggedInUser?.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			const resData = await res.json()
			setConversations(resData)
		}
		fetchConversations()
	}, [])

	useEffect(() => {
		const fetchUsers = async () => {
			const res = await fetch(`http://localhost:3000/api/users/${user?.id}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				}
			});
			const resData = await res.json()
			setUsers(resData)
		}
		fetchUsers()
	}, [])

	const fetchMessages = async (conversationId, receiver) => {
		const res = await fetch(`http://localhost:3000/api/message/${conversationId}?senderId=${user?.id}&&receiverId=${receiver?.receiverId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
		});
		const resData = await res.json()
		setMessages({ messages: resData, receiver, conversationId })
	}

	const sendMessage = async (e) => {
		setMessage('')
		socket?.emit('sendMessage', {
			senderId: user?.id,
			receiverId: messages?.receiver?.receiverId,
			message,
			conversationId: messages?.conversationId
		});
		const res = await fetch(`http://localhost:3000/api/message`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				conversationId: messages?.conversationId,
				senderId: user?.id,
				message,
				receiverId: messages?.receiver?.receiverId
			})
		});
	}


  return (
    <div className='w-screen flex'>
        <div className='w-[25%] bg-secondary  overflow-scroll '>
            <div className='flex  items-center my-8 mx-14'>
            <div className='border border-primary p-[2px] rounded-full'><img src={Avatar} width={75} height={75}/></div>
            <div className='ml-8'>
                <h3 className='text-2xl'>{user?.fullName}</h3>
                <p className='text-lg font-light '>My Account</p>
                </div>
            </div>
            <hr/>
            <div className='mx-14 mt-10'>
                <div className='text-primary text-lg'>Messages</div>
                <div>
                    {
                      conversations.length >0?
                        conversations.map(({conversationId,user})=>{
                            return (
                                <div className='flex  items-center py-8 border-b border-b-gray-300'>
                                <div className='cursor-pointer flex items-center'onClick={() =>
                                    fetchMessages(conversationId, user)}>
                                <div><img src={Avatar} width={60} height={60}/></div>
                                <div className='ml-6'>
                                    <h3 className='text-lg font-semibold'>{user?.fullName}</h3>
                                    <p className='text-sm font-light text-gray-600'>{user?.name}</p>
                                </div>
                            </div>
                            </div>
                            )
                        }):<div className='text-center text-lg font-semibold mt-24'>No Conversations</div>
                    }
                </div>
            </div>
        </div>
        <div className='w-[50%] h-screen bg-white flex flex-col items-center'>
            {
                messages?.receiver?.fullName &&
                <div className='w-[75%] bg-secondary h-[80px] my-14 rounded-full flex items-center px-14 shadow-md py-2'>
                <div className='cursor-pointer'><img src={Avatar} width={60} height={60}/></div>
                <div className='ml-6 mr-auto '>
                    <h3 className='text-lg font-semibold'>{messages?.receiver?.fullName}</h3>
                    <p className='text-sm font-light text-gray-600'>{messages?.receiver?.name}</p>
                </div>
                <div className='cursor-pointer'>
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-phone-outgoing" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />
                    <path d="M15 9l5 -5" />
                    <path d="M16 4l4 0l0 4" /></svg>
                </div>  
            </div>
            }
            <div className='h-[75%]  w-full overflow-scroll  shadow-sm'>
                <div className='p-14'>
                {
                    messages?.messages?.length > 0 ?
                    messages.messages.map(({message , user : { id } = {} }) => {
                        return (
                            <>
                            <div className={` max-w-[40%] rounded-b-xl p-4  mb-6 ${id === user?.id ?
                                'bg-primary text-white rounded-tl-xl  ml-auto' : 'bg-secondary rounded-tr-xl'}`}>
                                    {message}</div>
                            <div ref={messageRef}></div>
                            </>   
                        )
                    }):<div className='text-center text-lg font semibold mt-24'>No Messages</div>
                }
                </div>
            </div>
            {
                messages?.receiver?.fullName &&
                <div className='p-14 w-full flex items-center'>
                    <Input placeholder='Type a message...' value={message} onChange={(e) => setMessage(e.target.value)}
                     className='w-[75%]' inputClassname='p-4  border-0 shadow-md 
                    rounded-full bg-light focus:ring-0 focus:border-0 outline-none'/>
                    <div className={`ml-4 p-2 cursor-pointer bg-light rounded-full ${!message && 
                    'pointer-events-none'}`} onClick={() => sendMessage()}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-send" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M10 14l11 -11" />
                        <path d="M21 3l-6.5 18a.55 .55 0 0 1 -1 0l-3.5 -7l-7 -3.5a.55 .55 0 0 1 0 -1l18 -6.5" />
                        </svg>
                    </div>
                    <div  className={`ml-4 p-2 cursor-pointer bg-light rounded-full ${!message && 
                    'pointer-events-none'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-plus" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M12 5l0 14" />
                        <path d="M5 12l14 0" />
                        </svg>
            </div>
        </div>          
            }        
        </div>
        <div className='w-[25%] h-sreen bg-light px-8 py-16 overflow-scroll'>
            <div className='text-primary text-lg'>People</div>
            <div>
                    {
                      users.length >0?
                        users.map(({ userId, user})=>{
                            return (
                                <div className='flex  items-center py-8 border-b border-b-gray-300'>
                                <div className='cursor-pointer flex items-center'onClick={() =>
                                    fetchMessages('new', user)}>
                                <div><img src={Avatar} className='w-[60px] h-[60px] rounded-full p-[2px] border border-primary'/></div>
                                <div className='ml-6'>
                                    <h3 className='text-lg font-semibold'>{user?.fullName}</h3>
                                    <p className='text-sm font-light text-gray-600'>{user?.name}</p>
                                </div>
                            </div>
                            </div>
                            )
                        }):<div className='text-center text-lg font-semibold mt-24'>No Conversations</div>
                    }
                </div>
        </div>
    </div>
  )
}

export default Dashboard

