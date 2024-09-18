export class UserProfile{
    username?: string
    displayName?: string
}

export interface ICallRequest{ 
    //caller: string 
    receiverId: string 
    connectionId?: string
    id: number
    isCaller: boolean 
    //end: boolean 
}