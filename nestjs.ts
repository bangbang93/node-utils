import {ApiOperation} from '@nestjs/swagger'

export const ApiSummary = (summary: string) => ApiOperation({summary})
