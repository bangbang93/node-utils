import {NestFactory} from '@nestjs/core'
import {ApiOperation, DocumentBuilder, SwaggerModule} from '@nestjs/swagger'
import {writeFileSync} from "fs"
import * as path from "path"

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
