import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import type { McpSchema } from '@nestjs/mcp';

import { UsePipes } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { NextApiValidationPipe } from './validation-pipe.ts';

// A Zod DTO class. `createZodDto` gives the class a static `schema`.
interface ZodDtoClass extends Type {
  readonly schema: z.ZodType;
}

// The input schema of an MCP tool. The SDK validates the input against the
// input schema before the tool method runs, and its error result is plain
// text. The Next API validation pipe must check the input, so that an
// invalid input gets the Next API validation problem. Thus the `validate`
// function of this schema lets every value through unchanged. The JSON
// Schema stays the JSON Schema of the strict Zod schema, so `tools/list`
// still shows `additionalProperties: false`. The tool method must declare
// its input parameter with the same Zod DTO class, so that the pipe checks
// the input. A tool method that does not read its input uses `ToolInput`.
export function toolInputOf(dto: ZodDtoClass): McpSchema {
  const standard = dto.schema['~standard'];
  return {
    '~standard': {
      ...standard,
      validate: (value: unknown) => ({ value }),
    },
  };
}

// The input of an MCP tool that takes no field. The tool of an operation
// with no input gives this DTO to `toolInputOf` and to `ToolInput`, so that
// the pipe refuses every field.
export class NoToolInput extends createZodDto(z.strictObject({})) {}

// The pipe of one tool method that declares no input parameter. The adapter
// gives the input as a body parameter. The global validation pipe sees no
// type for it and lets it through. This pipe gives the input the Zod DTO
// class of the tool and runs the validation pipe of the Next API on it.
class ToolInputPipe implements PipeTransform {
  private readonly validation = new NextApiValidationPipe();

  constructor(private readonly dto: ZodDtoClass) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    return metadata.type === 'custom'
      ? value
      : this.validation.transform(value, { ...metadata, metatype: this.dto });
  }
}

// This decorator gives the input of an MCP tool method its Zod DTO class when
// the method declares no input parameter, for example a list tool. Then the
// validation pipe of the Next API checks the input.
export function ToolInput(dto: ZodDtoClass): MethodDecorator {
  return UsePipes(new ToolInputPipe(dto));
}
