import { ApiProperty } from '@nestjs/swagger';

// One product in the Next API. A product is a thing that the household
// stocks. The Next API owns this shape. The fields match Grocy today and can
// change when Grocy Next builds its own entity model.
export class Product {
  @ApiProperty({ description: 'The id of the product.' })
  id!: number;

  @ApiProperty({ description: 'The name of the product.' })
  name!: string;

  @ApiProperty({
    description: 'The description of the product, or null when it has none.',
    type: String,
    nullable: true,
  })
  description!: string | null;
}
