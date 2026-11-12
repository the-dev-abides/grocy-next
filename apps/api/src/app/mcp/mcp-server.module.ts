import type { DynamicModule, Type } from '@nestjs/common';

import { ProductsModule, ProductsTools } from '@grocy-next/inventory-products';
import { Injectable, Logger, Module, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpModule } from '@nestjs/mcp';
import { ApiExcludeController } from '@nestjs/swagger';

import type { McpOptions } from './mcp-options.ts';

import { readApiVersion } from '../../api-version.ts';
import { MCP_TOKEN, readMcpOptions } from './mcp-options.ts';
import { McpTokenGuard } from './mcp-token.guard.ts';

// The endpoint is `/api/v2/mcp`. The global prefix of the Next API applies.
const MCP_PATH = 'mcp';
const SERVER_NAME = 'grocy-next';

// This list holds the tool providers of the domain libraries. Add a new tool
// provider here, and add its module to the imports below.
const TOOL_PROVIDERS = [ProductsTools];

// With no token, the module only writes the log line at start.
@Injectable()
class McpOffNotice {
  private readonly logger = new Logger('McpServer');

  onModuleInit(): void {
    this.logger.log(`The MCP server is off. Set ${MCP_TOKEN} to turn it on.`);
  }
}

const MCP_OPTIONS_ERROR = 'MCP_OPTIONS_ERROR';

// NestJS awaits the promise of `forRoot` only when it builds the app. A
// rejection before then is an unhandled rejection. Thus `forRoot` returns
// this module, and its provider throws the error while NestJS builds the app.
function failedModuleOf(module: Type, error: unknown): DynamicModule {
  return {
    module,
    providers: [
      {
        provide: MCP_OPTIONS_ERROR,
        useFactory: () => {
          throw error;
        },
      },
    ],
  };
}

@Module({})
export class McpServerModule {
  // The config module reads the `.env` file first, so a token in that file
  // counts. With no token, the MCP module is not imported, and the endpoint
  // answers like any unknown path. A short token stops the start before the
  // process listens. The endpoint is not part of the OpenAPI document,
  // because it is not a Next API operation.
  static async forRoot(): Promise<DynamicModule> {
    await ConfigModule.envVariablesLoaded;
    let options: McpOptions | null;
    try {
      options = readMcpOptions();
    } catch (error) {
      return failedModuleOf(this, error);
    }
    if (options === null) {
      return { module: this, providers: [McpOffNotice] };
    }
    return {
      imports: [
        McpModule.forRoot({
          decorators: [
            UseGuards(new McpTokenGuard(options.token)),
            ApiExcludeController(),
          ],
          name: SERVER_NAME,
          path: MCP_PATH,
          version: readApiVersion(),
        }),
        ProductsModule,
      ],
      module: this,
      providers: TOOL_PROVIDERS,
    };
  }
}
