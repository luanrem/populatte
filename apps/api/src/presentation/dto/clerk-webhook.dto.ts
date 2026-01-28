export interface ClerkWebhookUserData {
  id: string;
  email_addresses: Array<{
    email_address: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: ClerkWebhookUserData;
}
