import Hls from "hls.js";

export function createThrottledLoader(
  getBandwidthMbps: () => number,
) {
  return class ThrottledLoader
    extends Hls.DefaultConfig.loader {

    load(
      context: any,
      config: any,
      callbacks: any,
    ) {

      // ------------------------------------------
      // Save original callback
      // ------------------------------------------

      const originalOnSuccess =
        callbacks.onSuccess;


      // ------------------------------------------
      // Wrap HLS.js success callback
      // ------------------------------------------

      callbacks.onSuccess = async (
        response: any,
        stats: any,
        loadedContext: any,
        networkDetails: any,
      ) => {

        // ----------------------------------------
        // Only throttle media fragments
        // ----------------------------------------

        if (
          loadedContext.type !==
          "media-fragment"
        ) {

          originalOnSuccess(
            response,
            stats,
            loadedContext,
            networkDetails,
          );

          return;
        }


        const data =
          response.data;


        const bytes =
          data instanceof ArrayBuffer
            ? data.byteLength
            : 0;


        if (bytes <= 0) {

          originalOnSuccess(
            response,
            stats,
            loadedContext,
            networkDetails,
          );

          return;
        }


        // ----------------------------------------
        // Current simulated bandwidth
        // ----------------------------------------

        const bandwidth =
          Math.max(
            getBandwidthMbps(),
            0.1,
          );


        // ----------------------------------------
        // Calculate simulated transfer
        // ----------------------------------------

        const simulatedSeconds =
          (
            bytes * 8
          ) /
          (
            bandwidth *
            1_000_000
          );


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


        // ----------------------------------------
        // Simulate network delay
        // ----------------------------------------

        await new Promise<void>(
          (resolve) => {

            setTimeout(
              resolve,
              simulatedSeconds * 1000,
            );

          },
        );


        // ----------------------------------------
        // IMPORTANT
        //
        // Preserve HLS.js's original stats and
        // only update the timing.
        // ----------------------------------------

        const end =
          performance.now();


        stats.loading.end =
          end;


        stats.loaded =
          bytes;


        stats.total =
          bytes;


        stats.bwEstimate =
          simulatedSeconds > 0
            ? (
                bytes * 8
              ) /
              simulatedSeconds
            : 0;


        // ----------------------------------------
        // Give control back to HLS.js
        // ----------------------------------------

        originalOnSuccess(
          response,
          stats,
          loadedContext,
          networkDetails,
        );
      };


      // ------------------------------------------
      // Let HLS.js perform the actual request
      // ------------------------------------------

      super.load(
        context,
        config,
        callbacks,
      );
    }
  };
}