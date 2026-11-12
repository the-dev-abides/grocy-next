import type { ArgumentMetadata, PipeTransform, Type } from '@nestjs/common';
import type { McpSchema, ToolOptions } from '@nestjs/mcp';

import { applyDecorators, UsePipes } from '@nestjs/common';
import { Tool } from '@nestjs/mcp';
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
// the input. A tool with no input uses `NoInputTool`.
export function toolInputOf(dto: ZodDtoClass): McpSchema {
  const standard = dto.schema['~standard'];
  return {
    '~standard': {
      ...standard,
      validate: (value: unknown) => ({ value }),
    },
  };
}

// The input of an MCP tool that takes no field. The pipe refuses every
// field.
class NoToolInput extends createZodDto(z.strictObject({})) {}

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

// This decorator marks an MCP tool with no input, for example a list tool.
// The tool method declares no input parameter. The decorator sets the input
// schema of the tool to the empty strict object, and it gives the input that
// Zod DTO class. Then the validation pipe of the Next API refuses every field.
export function NoInputTool(
  options: Omit<ToolOptions, 'inputSchema'>,
): MethodDecorator {
  return applyDecorators(
    Tool({ ...options, inputSchema: toolInputOf(NoToolInput) }),
    UsePipes(new ToolInputPipe(NoToolInput)),
  );
}
