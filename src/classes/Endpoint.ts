import fetch, { HeadersInit } from 'node-fetch'
import { Readable } from 'stream'
import { fail } from '../util'

export default class Endpoint {
    headers: HeadersInit

    constructor(private options: EndpointOptions) {
        this.headers = {
            'Content-Type': 'application/json',
            'User-Agent': options.userAgent
        }
    }

    async postData(body: PostDataOptions) {
        const res = await fetch(this.options.url, {
            body: Endpoint.createRequestBody(body),
            method: 'POST',
            headers: {
                ...this.headers,
                'Authorization': `Bearer ${this.options.token}`
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
    token: string
    userAgent: string
}

export interface PostDataOptions {
    cid: string
    version: string
    filenames: string[]
}
