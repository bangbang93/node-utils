import {NestFactory} from '@nestjs/core'
import {ApiOperation, ApiProperty, ApiPropertyOptional, DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import {IsInt, IsOptional, Min} from 'class-validator'
import {writeFileSync} from 'fs'
import * as path from 'path'
import {Constructor} from './index'

export const ApiSummary = (summary: string) => ApiOperation({summary})

interface IOptions {
  title?: string
  description?: string
  version?: string
}

export async function generateSwagger(appModule, options?: IOptions) {
  const app = await NestFactory.create(appModule);

  const builder = new DocumentBuilder()
    .setTitle(options?.title)
    .setDescription(options?.description)
    .setVersion(options?.version)
    .build();
  const document = SwaggerModule.createDocument(app, builder);
  const outputPath = path.resolve(process.cwd(), 'swagger.json');
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

export type Paged<T> = PagedResDto<T>
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
