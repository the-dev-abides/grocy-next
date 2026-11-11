import type {
  GrocyClient as GrocyClientType,
  ProductDetails,
} from '@grocy-next/inventory-products';

import { GrocyClient } from '@grocy-next/inventory-products';
import { Inject, Injectable, Logger } from '@nestjs/common';

import type { LookupProvider } from './lookup/lookup-provider.ts';
import type { LookupResult } from './pending-scan.ts';

import { LOOKUP_PROVIDER } from './lookup/lookup-provider.ts';

// A download that takes longer than this is a failed download.
const TIMEOUT_MS = 10_000;
// The file extension of each image type that the image host serves. An
// unknown type takes the extension of the URL path, or the JPEG extension.
const EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const DEFAULT_EXTENSION = 'jpg';
const PATH_EXTENSION = /\.([a-z0-9]+)$/i;

// One downloaded image: its bytes and the extension of its file name.
interface Image {
  bytes: Uint8Array;
  extension: string;
}

function extensionOf(url: string, contentType: null | string): string {
  const type = contentType?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  const { pathname } = new URL(url);
  const [, fromPath] = PATH_EXTENSION.exec(pathname) ?? [];
  return EXTENSIONS[type] ?? fromPath?.toLowerCase() ?? DEFAULT_EXTENSION;
}

// This function downloads the front image of a lookup result from the Open
// Facts image host. It uses the user agent of the lookup provider, as ADR 0011
// decided. Any status other than a success is a failed download.
async function downloadImage(url: string, userAgent: string): Promise<Image> {
  const response = await fetch(url, {
    headers: { accept: 'image/*', 'user-agent': userAgent },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `The image host answered ${String(response.status)} for ${url}.`,
    );
  }
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    extension: extensionOf(url, response.headers.get('content-type')),
  };
}

// The product picture of an update that sets a product. The lookup image goes
// to Grocy as the picture of the product when the lookup has an image and the
// product has no picture. The file is named after the product id, so a product
// never takes the file of another product.
@Injectable()
export class ProductPictures {
  private readonly logger = new Logger(ProductPictures.name);

  constructor(
    @Inject(GrocyClient)
    private readonly grocy: GrocyClientType,
    @Inject(LOOKUP_PROVIDER)
    private readonly provider: LookupProvider,
  ) {}

  // This method downloads the front image, uploads it through the Grocy file
  // API as a product picture, and sets the picture name on the product. A
  // download or an upload failure is logged and does not fail the update,
  // as the spec decided.
  async setFromLookup(
    product: ProductDetails,
    lookupResult: LookupResult | null,
  ): Promise<void> {
    const imageUrl = lookupResult?.imageUrl ?? null;
    if (imageUrl === null || product.hasPicture) {
      return;
    }
    try {
      const image = await downloadImage(imageUrl, this.provider.userAgent);
      const fileName = `product-${String(product.id)}.${image.extension}`;
      await this.grocy.uploadProductPicture(fileName, image.bytes);
      await this.grocy.setProductPicture(product.id, fileName);
    } catch (error) {
      this.logger.warn(
        `The picture of the product ${String(product.id)} was not set: ${String(error)}`,
      );
    }
  }
}
