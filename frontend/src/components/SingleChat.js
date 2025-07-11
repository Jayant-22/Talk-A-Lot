import { FormControl } from "@chakra-ui/form-control";
import { Box, Text } from "@chakra-ui/layout";
import React, { useEffect, useState } from "react";
import { ChatState } from "../Context/ChatProvider";
import { ArrowBackIcon } from "@chakra-ui/icons";
import { getSender, getSenderFull } from "../config/ChatLogics";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import "./styles.css";
import {  Spinner, useToast ,Input,IconButton} from "@chakra-ui/react";
import axios from "axios";
import ScrollableChat from "./ScrollableChat";
import Lottie from "react-lottie";
import animationData from "../animations/typing.json";

import io from "socket.io-client";


const ENDPOINT = "http://localhost:5000";
var socket, selectedChatCompare;

const SingleChat = ({fetchAgain, setFetchAgain}) => {
    const [messages, setMessages] = useState([]);
    const [loading , setLoading] = useState(false);
    const [newMessage , setNewMessage] = useState();
    const [socketConnected, setSocketConnected] = useState(false);
    const [typing, setTyping] = useState(false);  
    const [istyping, setIsTyping] = useState(false);  


const defaultOptions ={
  loop : true,
  autoplay : true,
  animationData: animationData,
  rendererSetting:{
    preserveAspectRatio: "xMidYMid slice",
  },
};


    const toast = useToast();
    const {user,selectedChat, setSelectedChat,notification,setNotification} = ChatState();

    const fetchMessages = async () => {
        if (!selectedChat) return;
    
        try {
          const config = {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          };
    
          setLoading(true);
    
          const { data } = await axios.get(
            `/api/message/${selectedChat._id}`,
            config
          );
      
          setMessages(data);
          setLoading(false);
    
          socket.emit("join chat", selectedChat._id);
        } catch (error) {
          toast({
            title: "Error Occured!",
            description: "Failed to Load the Messages",
            status: "error",
            duration: 5000,
            isClosable: true,
            position: "bottom",
          });
        }
      };
    
 useEffect(() => {
        socket = io(ENDPOINT);
        socket.emit("setup", user);
        socket.on("connected", () => setSocketConnected(true));
        socket.on("typing", () => setIsTyping(true));
        socket.on("stop typing", () => setIsTyping(false));
      
        // eslint-disable-next-line
      }, []);
      
useEffect(()=>{
    fetchMessages();
    selectedChatCompare = selectedChat;
},[selectedChat]);



useEffect(() => {
  socket.on("message recieved", (newMessageRecieved) => {
   if(!selectedChatCompare || selectedChatCompare._id !== newMessageRecieved.chat._id){

    if (!notification.includes(newMessageRecieved)) {
      setNotification([newMessageRecieved, ...notification]);
      setFetchAgain(!fetchAgain);
    }

   } else {
    setMessages([...messages,newMessageRecieved]);
   }
  });
});

 const  sendMessage =async(event) => {
    if(event.key==="Enter" && newMessage){
      socket.emit("stop typing",selectedChat._id);
    try {
        const config ={
            headers:{
                "content-type": "application/json",
                Authorization: `Bearer ${user.token}`,
            }
        };
        setNewMessage("");
        const{data} = await axios.post("/api/message",{
            content : newMessage,
            chatId: selectedChat._id,
        },
        config);

        
        socket.emit("new message",data);
        setMessages([...messages,data]);
    } catch (error) {
        toast({
            title : "Error Ouccred!",
            description : "Failed to send the Message",
            status : "error",
            isClosable : true,
            position : "bottom",
        });
        
    }
    }
 };

 

 const typingHandler = (e) => {
    setNewMessage(e.target.value);

    //typing indicator logic 
     
    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  return (
    <>
     {selectedChat ? (
        <>
        <Text 
             fontSize={{base: "20px" , md : "30px "}}
             pb={3}
             px={2}
             width="100%"
             fontFamily="Work sans"
             display="flex"
             justifyContent={{base : "space-between"}}
             alignItems="center">

                <IconButton
                d={{ base: "flex", md: "none" }}
                icon ={<ArrowBackIcon/>}
                onClick={() => setSelectedChat("")}/>

                {!selectedChat.isGroupChat ? (
                    <>
                    {getSender(user,selectedChat.users)}
                    <ProfileModal user= {getSenderFull(user,selectedChat.users)}/>
                    </>
                ):(
                    <>{selectedChat.chatName.toUpperCase()}
                    <UpdateGroupChatModal
                     fetchMessages={fetchMessages}
                    fetchAgain={fetchAgain}
                    setFetchAgain={setFetchAgain}
                   />
                    </>
                )}
            
            </Text>
            <Box 
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            padding={3}
            bg="#E8E8E8"
            width="100%"
            height="100%"
            borderRadius="lg"
            overflowY="hidden">

                  {loading ? (
                    <Spinner
                     size="xl"
                     w={10}
                     h={10}
                     alignSelf="center"
                     margin="auto"
                    />
                  ):(
                       <div className="messages">  
                           <ScrollableChat messages={messages}/>
                       </div>
                  )}            
                    <FormControl    onKeyDown={sendMessage} isRequired marginTop={3} >
                       {istyping ? <div> 
                             <Lottie
                             options={defaultOptions}
                             width={70}
                             style={{marginBottom:15, marginLeft:0}}
                             
                             />                       
                         </div> : (<></>)} 
                        <Input 
                        variant="filled"
                        bg="#E0E0E0"
                        placeholder="Enter a message...."
                        onChange={typingHandler}
                        value={newMessage}/>
                      
                    </FormControl>
            </Box>
            </>
     ) : ( 
        <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Text fontSize='3xl' paddingBottom={3} fontFamily="Work sans">
                Click on a user to start chatting
            </Text>
        </Box>
     )}
    
    </>
  );
};
export default SingleChat;