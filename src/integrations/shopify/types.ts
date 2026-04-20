export type NormalizedProduct = {
  id: string;
  title: string;
  description: string;
};

export type ShopifyProductRest = {
  id: number;
  title?: string;
  body_html?: string | null;
};

export type ShopifyProductsListResponse = {
  products?: ShopifyProductRest[];
};

export type ShopifyProductEnvelope = {
  product?: ShopifyProductRest;
};
