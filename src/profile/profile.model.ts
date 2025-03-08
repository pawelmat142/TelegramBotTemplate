import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { HydratedDocument } from "mongoose"
import { Expose } from "@nestjs/class-transformer"

export type ProfileDocument = HydratedDocument<Profile>

export type Status = 'ACTIVE' | 'INACTIVE'

@Schema()
export class Profile {
    
    @Expose()
    @Prop({ required: true })
    uid: string
    
    @Expose()
    @Prop({ required: true })
    name: string
    
    @Expose()
    @Prop({ required: true })
    status: Status
    
    @Expose()
    @Prop({ required: true })
    roles: string[]
    
    @Prop({required: true})
    @Expose()
    telegramChannelId: string
    
    @Prop()
    created: Date
    
    @Prop()
    modified: Date
}

export const ProfileSchema = SchemaFactory.createForClass(Profile)


