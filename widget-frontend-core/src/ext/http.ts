import axios from "axios"

export interface HttpClientProxy {
    cli: HttpClient;
}

export interface HttpClient {
    send(method: string, url: string, params: Record<string, any>, body: any, headers: Record<string, any>, responseType: string, option?: Record<string, any>): Promise<any>;
}

/** We provide a default http client!
 *  You can replace this client if necessary.
 */
const defaultClient: HttpClient = {
    send(method: string, url: string, params: Record<string, any>, body: any, headers: Record<string, any>, responseType: string, option?: Record<string, any>): Promise<any> {
        headers.responseType = responseType
        return axios({method, url, params, ...body, headers, responseType}).then(resp => Object.assign(resp, {data: resp.data.data}))
    }
}

export const proxy: HttpClientProxy = {cli: defaultClient}