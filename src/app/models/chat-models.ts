export class ChatMessage{
    message?: string
    sentTime?: string
    readTime?: string
    ref?: string
    id?: number
    senderId?: string
    recepientId?: string
    isSent?: boolean
    isDelivered?: boolean
    deliveryTime?: string
    isRead?: boolean
    constructor(){
        this.ref = Math.floor(Math.random() * 1000000000).toString()
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