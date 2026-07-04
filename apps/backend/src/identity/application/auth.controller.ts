import { Body, Controller, HttpCode, Post, Req, Res, UsePipes } from "@nestjs/common";

import { ZodValidationPipe } from "../../shared/validation/zod-validation.pipe";
import { unwrap } from "../../shared/result";

import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL_MS } from "./auth.constants";
import type { AuthSuccess } from "./auth-success";
import { loginSchema, type LoginDto } from "./dto/login.schema";
import { registerSchema, type RegisterDto } from "./dto/register.schema";
import { LoginUserUseCase } from "./use-cases/login-user.use-case";
import { LogoutUseCase } from "./use-cases/logout.use-case";
import { RefreshSessionUseCase } from "./use-cases/refresh-session.use-case";
import { RegisterUserUseCase } from "./use-cases/register-user.use-case";

// Minimal request/response shapes this controller depends on, following the same
// dependency-light pattern as shared/filters/problem-details.filter.ts.
interface AuthRequest {
  ip?: string;
  cookies?: Record<string, string | undefined>;
}

interface AuthResponse {
  cookie(name: string, value: string, options: Record<string, unknown>): void;
  status(code: number): AuthResponse;
}

const REFRESH_COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none" as const,
  path: REFRESH_COOKIE_PATH,
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUserUseCase,
    private readonly loginUseCase: LoginUserUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Post("register")
  @HttpCode(201)
  @UsePipes(new ZodValidationPipe(registerSchema))
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: AuthResponse,
  ): Promise<{ accessToken: string }> {
    const result = await this.registerUseCase.execute(dto, req.ip ?? "unknown");
    const auth = unwrap(result);
    this.setRefreshCookie(res, auth);
    return { accessToken: auth.accessToken };
  }

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: AuthResponse,
  ): Promise<{ accessToken: string }> {
    const result = await this.loginUseCase.execute(dto, req.ip ?? "unknown");
    const auth = unwrap(result);
    this.setRefreshCookie(res, auth);
    return { accessToken: auth.accessToken };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: AuthResponse,
  ): Promise<{ accessToken: string }> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const result = await this.refreshUseCase.execute(rawToken);
    const auth = unwrap(result);
    this.setRefreshCookie(res, auth);
    return { accessToken: auth.accessToken };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: AuthResponse): Promise<void> {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await this.logoutUseCase.execute(rawToken);
    res.cookie(REFRESH_COOKIE_NAME, "", { ...REFRESH_COOKIE_BASE_OPTIONS, maxAge: 0 });
  }

  private setRefreshCookie(res: AuthResponse, auth: AuthSuccess): void {
    res.cookie(REFRESH_COOKIE_NAME, auth.refreshToken, {
      ...REFRESH_COOKIE_BASE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }
}
