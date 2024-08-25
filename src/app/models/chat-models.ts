export class ChatMessage{
    message?: string
    sentTime?: string
    readTime?: string
    ref: number = Math.floor(Math.random() * 1000000000)
    id?: string
    senderId?: string
    isSent?: boolean
    isDelivered?: boolean
    isRead?: boolean
}

export class RecentChat{
    id?: string
    userId?: string
    profilePic?: string
    userName?: string
    isOnline?: boolean
    lastActiveTime?: string
    lastMessage?: string
    senderId?: string
    sentTime?: Date
    unreadCount?: number = 0
    chats?: ChatMessage[]
}