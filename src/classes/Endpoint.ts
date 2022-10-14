import fetch from 'node-fetch'
import { Readable } from 'stream'
import { fail } from '../util'

export default class Endpoint {
    headers: any

    constructor(private options: EndpointOptions) {
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': options.userAgent
        }
    }

    async fetchToken() {
        const res = await fetch(this.options.authUrl, {
            body: Endpoint.createRequestBody({
                id: this.options.id,
                secret: this.options.secret
            }),
            method: 'GET',
            headers: this.headers
        })

        if (!res.ok) fail(`Could not get bearer token from endpoint, endpoint returned status ${res.status}`)

        const json = await res.json()
        if (!('access_token' in json) || !json.access_token) fail(`Could not get bearer token from endpoint, endpoint did not supply access_token field`)

        return json.access_token as string
    }

    async postData(body: PostDataOptions, token: string) {
        const res = await fetch(this.options.url, {
            body: Endpoint.createRequestBody(body),
            method: 'POST',
            headers: {
                ...this.headers,
                'Authorization': `Bearer ${token}`
            }
        })

        if (!res.ok) fail(`Could not post data to endpoint, endpoint returned status ${res.status}`)

        return res
    }

    static createRequestBody(body: any) {
        return Readable.from(JSON.stringify(body))
    }
}

export interface EndpointOptions {
    url: string
    authUrl: string
    
    id: string
    secret: string

    userAgent?: string
}

export interface PostDataOptions {
    cid: string
    version: string
    filenames: string[]
}