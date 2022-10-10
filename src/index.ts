import { getInput, getMultilineInput, setFailed, debug, isDebug } from '@actions/core'
import { lstatSync, readFileSync } from 'fs'
import { Web3Storage } from 'web3.storage'
import { sync as glob } from 'fast-glob'
import { resolve, basename } from 'path'
import { Readable } from 'stream'
import fetch from 'node-fetch'
import semverCoerce from 'semver/functions/coerce'

function debugLog(...elements: any[]) {
    if (isDebug()) {
        console.debug(...elements)
    }
}

// CommonJS does not have top-level-await
(async () => {

    // Action options
    const globs = getMultilineInput('files', { required: true })
    const mainFilePattern = new RegExp(getInput('main-file-pattern') ?? '.+')
    
    const apiUrl = getInput('api-url')
    const apiUserAgent = getInput('api-user-agent')
    const apiAuthHeader = getInput('api-auth-header')
    
    const secret = getInput('secret', { required: true })


    debug('Options has been retrieved.')
    debugLog({ globs, mainFilePattern, apiUrl, apiUserAgent })
    debugLog(`There ${apiAuthHeader ? 'is' : 'is not'} an API authorization header.`)
    
    
    // Action options validations
    if (apiUserAgent.match(/\s/)) {
       setFailed('Specified User-Agent contains whitespaces, please remove any whitespaces in the User-Agent string.')
       process.exit(1)
    }


    // Create client
    const client = new Web3Storage({
        token: secret
    })

    debug('Client is initialized.')

    // Reading files and other headache stuff
    const possibleMainFiles: string[] = []

    const files = glob(globs)
      // Map to absolute paths
      .map(fp => resolve(process.cwd(), fp))
      // Filter non-directory entries
      .filter(fp => !lstatSync(fp).isDirectory())
      // Map it to an object
      .map(fp => {
          const name = basename(fp)
          
          debug(`Found file: ${fp}`)

          // If the version can be coerced, make it a possible main file
          const matches = semverCoerce(name, { rtl: true })
          if (matches) {
            debug('It can be coerced, pushing...')
            possibleMainFiles.push(name)
          }

          return {
              data: new Blob([ readFileSync(fp) ], {
                  type: 'application/octet-stream'
              }), 
              name
          }
      })
      // Map the object to File
      .map(blob => new File([ blob.data ], blob.name))
    
    // Send requests to create an entry and retrieve CID
    const cid = await client.put(files)
    debug(`Putted files. CID: ${cid}`)

    debug('Guessing versions...')
    console.debug(possibleMainFiles)

    const mainFiles = possibleMainFiles
      // Filter possible main files with pattern
      .filter(f => mainFilePattern.test(f))
      // And filter one that has semantic versioning
      .map(f => semverCoerce(f, { rtl: true }))
      .filter(x => !!x)

    debug('Filtered main files.')
    debugLog(mainFiles)

    if (!mainFiles[0]) {
      setFailed('No main files. Cannot guess version.')
      process.exit(1)
    }
    
    if (mainFiles.length > 1) {
      setFailed(`There are ${mainFiles.length} possible main files (re-run with debug to list). Please be more specific in your main-file-pattern. Cannot guess version.`)
      process.exit(1)
    }

    // If an API URL is specified, send a POST request with data
    if (apiUrl) fetch(apiUrl, {
      body: Readable.from(
        JSON.stringify({
          cid,
          version: mainFiles[0],
          filenames: files.map(f => f.name)
        })
      ),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
          'User-Agent': apiUserAgent
      }
   })

   debug('POST request has been made.')

})()
