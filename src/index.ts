import * as core from '@actions/core'
import fs from 'fs'
import { Web3Storage } from 'web3.storage'
import fg from 'fast-glob'
import path from 'path'
import { Readable } from 'stream'

// node-fetch@<3 requires you to import like this

import * as _nf from 'node-fetch'
const { default: fetch } = _nf

const globList = core.getMultilineInput('files', { required: true })
const apiUrl = core.getInput('api_url')
const secret = core.getInput('secret', { required: true })
const ua = core.getInput('api_user_agent')

const client = new Web3Storage({ token: secret })

const paths = fg.sync(globList).map(fp => path.resolve(process.cwd(), fp))
const blobs = paths
  .filter(fp => !fs.lstatSync(fp).isDirectory())
  .map(fp => { return { blob: new Blob([ fs.readFileSync(fp) ], { type: 'application/octet-stream' }), name: path.basename(fp) } })

const files = blobs.map(({ blob, name }) => new File([ blob ], name))

const stores = await Promise.all(
  files.map(file => {
    return { cId: client.put([ file ]), file }
  })
)

if (apiUrl) stores.forEach(({ cId, file }) => {
  fetch(apiUrl, {
    body: Readable.from(
      JSON.stringify({
        cid: cId,
        version: null,
        filename: file.name
      })
    ),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ua
    }
  })
})
