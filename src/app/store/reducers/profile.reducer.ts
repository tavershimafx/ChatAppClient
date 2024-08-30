import { createReducer, on } from "@ngrx/store";
import { userGlobal } from "../actions/profile.action";
import { UserProfile } from "src/app/models/app.models";


const userState: UserProfile = { }

export const UserProfileReducer = createReducer(userState,
    on(userGlobal, (state, { profile }) => ({ ...profile} ))
)
