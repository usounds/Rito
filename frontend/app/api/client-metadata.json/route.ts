import { getClientMetadata } from '@/logic/HandleOauth'

export async function GET() {
  const obj = getClientMetadata();
  if (!obj) {
    return new Response(JSON.stringify({ error: 'No metadata found for the environment.' + origin }), {
      status: 500,
      headers: {
        'content-type': 'application/json'
      }
    });
  }

  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    }
  });

}