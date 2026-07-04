import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { AppController } from "./app.controller";
import { IdentityModule } from "./identity/infrastructure/identity.module";

@Module({
  imports: [EventEmitterModule.forRoot(), IdentityModule],
  controllers: [AppController],
})
export class AppModule {}
