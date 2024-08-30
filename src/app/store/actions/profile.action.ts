import { createAction, props } from "@ngrx/store";
import { UserProfile } from "src/app/models/app.models";


export const userGlobal = createAction('[UserProfile] GetUserProfile', props<{ profile: UserProfile}>())