import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { connectMongo } from '@/lib/db/mongo'
import { User } from '@/lib/db/models'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.SVIX_SECRET

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add SVIX_SECRET from Clerk Dashboard to .env or .env.local')
  }

  const wh = new Webhook(SIGNING_SECRET)

  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error: Could not verify webhook:', err)
    return new Response('Error: Verification error', {
      status: 400,
    })
  }

  const eventType = evt.type

  await connectMongo()

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data

    await User.create({
      _id: uuidv4(),
      clerkId: id,
      email: email_addresses[0].email_address,
      firstName: first_name,
      lastName: last_name,
    })
  } else if (eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data

    await User.updateOne(
      { clerkId: id },
      {
        email: email_addresses[0].email_address,
        firstName: first_name,
        lastName: last_name,
      }
    )
  } else if (eventType === 'user.deleted') {
    const { id } = evt.data
    if (id) {
       await User.deleteOne({ clerkId: id })
    }
  }

  return new Response('Webhook received', { status: 200 })
}
