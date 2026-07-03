import type { Placeholder } from "@bora/shared";
import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHealth(): { status: string; placeholder?: Placeholder } {
    return { status: "ok" };
  }
}
