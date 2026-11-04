import { ApiProperty } from '@nestjs/swagger';

// One product in the Next API. A product is a thing that the household
// stocks. The Next API has its own shape and does not copy the Grocy fields.
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
