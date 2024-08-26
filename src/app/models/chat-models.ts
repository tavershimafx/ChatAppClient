export class ChatMessage{
    message?: string
    sentTime?: string
    readTime?: string
    ref?: number
    id?: string
    senderId?: string
    recepientId?: string
    isSent?: boolean
    isDelivered?: boolean
    isRead?: boolean
    constructor(){
        this.ref = Math.floor(Math.random() * 1000000000)
    }
}

export class RecentChat{
    id?: string
    profilePic?: string
    username?: string
    displayName?: string
    isOnline?: boolean
    lastActiveTime?: string
    lastMessage?: string
    senderId?: string
    sentTime?: Date
    unreadCount?: number = 0
    chats?: ChatMessage[]
}