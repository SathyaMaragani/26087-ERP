import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser, AppRequest } from '../../common/types/request-context';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account (and optionally initial institution)' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: AppRequest) {
    return this.authService.register(dto, req);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, JWT token issued' })
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: AppRequest) {
    return this.authService.login(dto, req);
  }

  @ApiOperation({ summary: 'Switch active institution context and receive updated JWT token' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('switch-tenant')
  async switchTenant(
    @Body() dto: SwitchTenantDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: AppRequest,
  ) {
    return this.authService.switchTenant(dto, user.id, req);
  }

  @ApiOperation({ summary: 'Get current user profile and accessible institutions' })
  @ApiBearerAuth()
  @Get('me')
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
