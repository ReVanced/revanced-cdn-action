import { debug, getInput, getMultilineInput, isDebug, setFailed } from '@actions/core'
import { lstatSync } from 'fs'
import { sync as glob } from 'fast-glob'
import { resolve } from 'path'

export function debugLog(...elements: any[]) {
    if (!isDebug()) return
    if (elements.length < 2 && typeof elements[0] === 'string') {
        debug(elements[0])
    } else {
        console.debug(...elements)
    }
}

export function fail(msg: string): never {
    setFailed(msg)
    process.exit(1)
}

export function getFiles(pattern: string | string[]) {
    return glob(pattern)
        // Map to absolute paths and filter out directories
        .map(fp => resolve(process.cwd(), fp))
        .filter(fp => !lstatSync(fp).isDirectory())
}

export function getOptions() {
    return {

        // File System Configuration

        files: getMultilineInput('files', { required: true }),
        mainFilePattern: getInput('main-file-pattern') ?? '.+',

        // Endpoint Configuration

        endpoint: getInput('endpoint'),
        authEndpoint: getInput('auth-endpoint'),
        endpointUA: getInput('endpoint-user-agent'),

        // Endpoint Authorization

        endpointClientId: getInput('endpoint-token'),

        // CDN Authorization

        cdnToken: getInput('cdn-token', { required: true })
    }
}
