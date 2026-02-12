import {applyDecorators, FactoryProvider, forwardRef, Inject, Param, ParseIntPipe, Type} from '@nestjs/common'
import {ModuleMetadata} from '@nestjs/common/interfaces'
import {NestFactory} from '@nestjs/core'
import {
  ApiBody, ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, ApiResponse, DocumentBuilder, SwaggerModule,
} from '@nestjs/swagger'
import {ServerVariableObject} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import {IsInt, IsMongoId, IsOptional, Matches, Max, Min} from 'class-validator'
import {writeFileSync} from 'fs'
import * as path from 'path'
import {Constructor} from './index'

export const ApiSummary = (summary: string): MethodDecorator => ApiOperation({summary})

interface IGenerateSwaggerOptions {
  title?: string
  description?: string
  version?: string
  prefix?: string
  outputPath?: string
  servers?: {
    url: string
    description?: string
    variables?: Record<string, ServerVariableObject>
  }[]
}

export async function generateSwagger(appModule: Type, options: IGenerateSwaggerOptions = {}): Promise<void> {
  const app = await NestFactory.create(appModule)

  const builder = new DocumentBuilder()
    .setTitle(options?.title ?? 'app')
    .setDescription(options?.description ?? '')
    .setVersion(options?.version ?? '')
  if (options.prefix) {
    app.setGlobalPrefix(options.prefix)
  }
  if (options.servers) {
    for (const server of options.servers) {
      builder.addServer(server.url, server.description, server.variables)
    }
  }
  const document = SwaggerModule.createDocument(app, builder.build())
  const outputPath = options.outputPath ?? path.resolve(process.cwd(), 'swagger.json')
  writeFileSync(outputPath, JSON.stringify(document), {encoding: 'utf8'})

  await app.close()
}

let DefaultPageLimit = 10
const MAX_PAGE = 500

export function setDefaultPageLimit(limit: number): void {
  DefaultPageLimit = limit
}

export function getDefaultPageLimit(): number {
  return DefaultPageLimit
}

export class PagedDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page: number = 1
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(MAX_PAGE) limit: number = getDefaultPageLimit()

  get skip(): number {
    return (this.page - 1) * this.limit
  }

  set skip(value: number) {
    // noop
  }
}

export class SortablePagedDto extends PagedDto {
  @ApiPropertyOptional({description: '例： +createdAt,"+-"代表正序倒序'}) @IsOptional() @Matches(/^[+-].+$/)
    sort?: string
}

export class IdDto {
  @ApiProperty() @IsMongoId() id!: string
}

export interface PagedResDto<T> {
  count: number
  data: T[]
}
export function PagedResDto<T extends Constructor>(constructor: T): Constructor<PagedResDto<InstanceType<T>>> {
  const name = `Paged${constructor.name}`

  class PagedRes implements PagedResDto<InstanceType<T>> {
    @ApiProperty() count!: number
    @ApiProperty({type: [constructor]}) data!: InstanceType<T>[]
  }

  Reflect.defineProperty(PagedRes, 'name', {
    writable: false,
    enumerable: false,
    configurable: true,
    value: name,
  })

  return PagedRes
}

export function ApiFile(fileName: string = 'file'): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fileName]: {
            type: 'file',
            format: 'blob',
          },
        },
      },
    }),
  )
}

export type DynamicModuleOptions<T> = Omit<FactoryProvider<T>, 'provide'> & {imports?: ModuleMetadata['imports']}

export function IntParam(name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    Param(name, ParseIntPipe)(target, propertyKey, parameterIndex)
  }
}

export function InjectRef<T>(fn: () => Type<T>): ReturnType<typeof Inject> {
  return Inject(forwardRef(fn))
}

type ServiceErrorDefinition = Record<string, readonly [message: string, httpCode?: number]>

/**
 * Api错误响应装饰器
 * @param errors 错误定义
 * @param code 错误码
 * @param message 错误信息
 * @param description 描述
 * @example @ApiError(ServiceErrors, 'COMMON_NO_SUCH_OBJECT', '找不到对象')
 */
export function ApiError<T extends ServiceErrorDefinition>(
  errors: T,
  code: keyof T,
  message?: string,
  description = message,
): MethodDecorator & ClassDecorator {
  const error = errors[code]
  return applyDecorators(
    ApiResponse({
      status: error[1] as number,
      description,
      schema: {
        properties: {
          code: {
            type: 'string',
            example: code,
          },
          message: {
            type: 'string',
            example: message ?? error[0],
          },
        },
      },
    }),
  )
}
