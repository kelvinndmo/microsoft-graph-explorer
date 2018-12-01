import { Injectable } from '@angular/core';
import { ConnectionBackend, Http, RequestOptions, RequestOptionsArgs } from '@angular/http';
import { Observable } from 'rxjs';
import { AppComponent } from '../app.component';

@Injectable()
export class GraphRequestInterceptor extends Http {
    constructor(connectionBackend: ConnectionBackend, requestOptions: RequestOptions) {
        super(connectionBackend, requestOptions);
    }

    public get(url: string, options?: RequestOptionsArgs): Observable<any> {
        this.updateGraphExplorerOptions(options);
        return super.get(url, options);
    }

    public put(url: string, body: any, options?: RequestOptionsArgs): Observable<any> {
       this.updateGraphExplorerOptions(options);
       return super.put(url, body, options);
    }

    public post(url: string, body: any, options?: RequestOptionsArgs): Observable<any> {
        this.updateGraphExplorerOptions(options);
        return super.post(url, body, options);
    }

    public delete(url: string, options?: RequestOptionsArgs): Observable<any> {
        this.updateGraphExplorerOptions(options);
        return super.delete(url, options);
    }

    public patch(url: string, body: any, options?: RequestOptionsArgs): Observable<any> {
        this.updateGraphExplorerOptions(options);
        return super.patch(url, body, options);
    }

    private updateGraphExplorerOptions(options) {

        if (options !== undefined) {
            const { headers: requestHeaders } = options;
            const headerKeys = requestHeaders.keys();
            const reqHeaders = [];

            headerKeys.forEach((headerKey) => {
                reqHeaders.push({
                    name: headerKey,
                    value: requestHeaders.get(headerKey),
                });
            });
            AppComponent.explorerValues.headers.unshift(...reqHeaders);
        }
    }
}