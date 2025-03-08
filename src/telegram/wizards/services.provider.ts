import { Injectable } from "@nestjs/common";
import { ProfileService } from "src/profile/profile.service";

@Injectable()
export class ServiceProvider {
    
    constructor(
        public readonly profileService: ProfileService,
    ) {}

}