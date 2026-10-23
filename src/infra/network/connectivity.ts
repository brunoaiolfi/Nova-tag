import type {Connectivity} from '../../appplication/ports/app-services';

export const connectivity: Connectivity = {
  subscribeWhenOnline(listener) {
    let disposed = false;
    let subscription: {remove(): void} | undefined;
    // Registration is lazy so an older development build can still open the app.
    void Promise.resolve()
      .then(() => require('expo-network') as typeof import('expo-network'))
      .then(network => {
        if (!disposed)
          subscription = network.addNetworkStateListener(state => {
            if (
              !disposed &&
              state.isConnected &&
              state.isInternetReachable !== false
            )
              listener();
          });
      })
      .catch(() => {});
    return () => {
      if (disposed) return;
      disposed = true;
      subscription?.remove();
    };
  },
};
