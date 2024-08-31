export class UserProfile{
    username?: string
    displayName?: string
}

export interface ICallRequest{ 
    receiverId: string 
    connectionId?: string
    isCaller: boolean 
    end: boolean 
}