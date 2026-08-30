import Hls from "hls.js";

export function createThrottledLoader(
  getBandwidthMbps: () => number,
) {
  return class ThrottledLoader
    extends Hls.DefaultConfig.loader {

    private xhr: XMLHttpRequest | null = null;

    load(
      context: any,
      config: any,
      callbacks: any,
    ) {

      const xhr =
        new XMLHttpRequest();

      this.xhr =
        xhr;

      const startTime =
        performance.now();


      xhr.open(
        context.method || "GET",
        context.url,
        true,
      );


      xhr.responseType =
        context.responseType ||
        "arraybuffer";


      xhr.onload =
        async () => {

          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {

            callbacks.onError(
              {
                code: xhr.status,
                text:
                  xhr.statusText,
              },
              context,
              xhr,
            );

            return;
          }


          const data =
            xhr.response;


          const bytes =
            data instanceof ArrayBuffer
              ? data.byteLength
              : 0;


          // =========================================
          // IGNORE ZERO-BYTE RESPONSES
          // =========================================

          if (bytes <= 0) {

            callbacks.onSuccess(
              {
                url:
                  xhr.responseURL ||
                  context.url,

                data,

                code:
                  xhr.status,
              },

              {
                loading: {
                  start: startTime,
                  first: startTime,
                  end:
                    performance.now(),
                },

                parsing: {
                  start: 0,
                  end: 0,
                },

                buffering: {
                  start: 0,
                  first: 0,
                  end: 0,
                },

                loaded: 0,
                total: 0,

                aborted: false,

                retry: 0,

                chunkCount: 1,

                bwEstimate: 0,
              },

              context,

              xhr,
            );

            return;
          }


          // =========================================
          // CURRENT SIMULATED BANDWIDTH
          // =========================================

          const bandwidth =
            getBandwidthMbps();


          // =========================================
          // SIMULATED TRANSFER TIME
          // =========================================

          const simulatedSeconds =
            (bytes * 8) /
            (bandwidth * 1_000_000);


          console.log(
            "🌐 Simulated bandwidth:",
            bandwidth.toFixed(2),
            "Mbps",
          );

          console.log(
            "📦 Bytes:",
            bytes,
          );

          console.log(
            "⏱️ Simulated transfer:",
            simulatedSeconds.toFixed(2),
            "seconds",
          );


          // =========================================
          // SIMULATE NETWORK DELAY
          // =========================================

          await new Promise<void>(
            (resolve) => {

              setTimeout(
                resolve,
                simulatedSeconds * 1000,
              );

            },
          );


          const endTime =
            performance.now();


          // =========================================
          // HLS.JS LOADER STATS
          // =========================================

          const stats = {

            loading: {

              start:
                startTime,

              first:
                startTime,

              end:
                endTime,
            },

            parsing: {

              start: 0,

              end: 0,
            },

            buffering: {

              start: 0,

              first: 0,

              end: 0,
            },

            loaded:
              bytes,

            total:
              bytes,

            aborted:
              false,

            retry:
              0,

            chunkCount:
              1,

            bwEstimate:
              simulatedSeconds > 0
                ? (
                    bytes * 8
                  ) /
                  simulatedSeconds
                : 0,
          };


          // =========================================
          // RETURN TO HLS.JS
          // =========================================

          callbacks.onSuccess(
            {
              url:
                xhr.responseURL ||
                context.url,

              data,

              code:
                xhr.status,
            },

            stats,

            context,

            xhr,
          );
        };


      // ===========================================
      // NETWORK ERROR
      // ===========================================

      xhr.onerror = () => {

        callbacks.onError(
          {
            code:
              xhr.status || 0,

            text:
              xhr.statusText ||
              "Network error",
          },

          context,

          xhr,
        );
      };


      // ===========================================
      // ABORT
      // ===========================================

      xhr.onabort = () => {

        callbacks.onError(
          {
            code: 0,

            text:
              "Request aborted",
          },

          context,

          xhr,
        );
      };


      // ===========================================
      // START REQUEST
      // ===========================================

      xhr.send(
        context.body || null,
      );
    }


    abort() {

      if (this.xhr) {
        this.xhr.abort();
      }

    }


    destroy() {

      if (this.xhr) {
        this.xhr.abort();
      }

      this.xhr = null;
    }
  };
}