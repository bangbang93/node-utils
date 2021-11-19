import {applyDecorators, FactoryProvider, Param, ParseIntPipe, Type, Inject, forwardRef} from '@nestjs/common'
import {ModuleMetadata} from '@nestjs/common/interfaces'
import {NestFactory} from '@nestjs/core'
import {
  ApiConsumes, ApiOperation, ApiProperty, ApiPropertyOptional, DocumentBuilder, SwaggerModule,
} from '@nestjs/swagger'
import {ApiImplicitBody} from '@nestjs/swagger/dist/decorators/api-implicit-body.decorator'
import {ServerVariableObject} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface'
import {IsInt, IsMongoId, IsOptional, Matches, Min} from 'class-validator'
import {writeFileSync} from 'fs'
import * as path from 'path'
import {Constructor} from './index'

export const ApiSummary = (summary: string) => ApiOperation({summary})

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

export async function generateSwagger(appModule, options: IGenerateSwaggerOptions = {}) {
  const app = await NestFactory.create(appModule);

  const builder = new DocumentBuilder()
    .setTitle(options?.title)
    .setDescription(options?.description)
    .setVersion(options?.version)
  if (options.prefix) {
    app.setGlobalPrefix(options.prefix)
  }
  if (options.servers) {
    for (const server of options.servers) {
      builder.addServer(server.url, server.description, server.variables)
    }
  }
  const document = SwaggerModule.createDocument(app, builder.build());
  const outputPath = options.outputPath ?? path.resolve(process.cwd(), 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document), { encoding: 'utf8'});

  await app.close();
}

export class PagedDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) page: number = 1
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) limit: number = 10

  get skip() {
    return (this.page - 1) * this.limit
  }
}

export class SortablePagedDto extends PagedDto {
  /** 例： +createdAt,"+-"代表正序倒序 */
  @ApiPropertyOptional() @IsOptional() @Matches(/^[+-].+$/) sort?: string
}

export class IdDto {
  @ApiProperty() @IsMongoId() id: string
}

export interface PagedResDto<T> {
  count: number
  data: T[]
}
export function PagedResDto<T extends Constructor>(constructor: T): Constructor<PagedResDto<T>> {
  const name = `Paged${constructor.name}`

  class PagedRes implements PagedResDto<T> {
    @ApiProperty() count: number
    @ApiProperty({type: [constructor]}) data: T[]
  }

  Reflect.defineProperty(PagedRes, 'name', {
    writable: false,
    enumerable: false,
    configurable: true,
    value: name,
  })

  return PagedRes
}

export function ApiFile (fileName: string = 'file'): MethodDecorator {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiImplicitBody({
      name: fileName,
      type: 'file',
      content: {
        file: {
          schema: {
            type: 'file',
          },
        }
      },
    })
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
