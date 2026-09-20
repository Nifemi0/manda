(() => {
  const NETWORKS = {
    '0x66eee': { name: 'Arbitrum Sepolia', chainId: '0x66eee', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'], blockExplorerUrls: ['https://sepolia.arbiscan.io'] },
    '0xb626': { name: 'Robinhood Chain Testnet', chainId: '0xb626', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://rpc.testnet.chain.robinhood.com'], blockExplorerUrls: ['https://explorer.testnet.chain.robinhood.com'] }
  };
  const state = { address: null, chainId: null };
  const OWNER_KEY = 'manda-owner';
  const LEGACY_OWNER_KEY = 'shared-account-owner';
  const announcedProviders = [];
  let activeProvider = null;
  const provider = () => activeProvider || announcedProviders[0]?.provider || window.ethereum;
  const network = chainId => NETWORKS[chainId] || null;
  const shortAddress = address => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
  function publish() {
    const detail = { ...state, network: network(state.chainId), supported: Boolean(network(state.chainId)) };
    if (state.address) sessionStorage.setItem(OWNER_KEY, JSON.stringify(detail));
    else {
      sessionStorage.removeItem(OWNER_KEY);
      sessionStorage.removeItem(LEGACY_OWNER_KEY);
    }
    window.dispatchEvent(new CustomEvent('walletstatechange', { detail }));
    return detail;
  }
  async function refresh() {
    const candidates = [...announcedProviders.map(item => item.provider), window.ethereum].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
    if (!candidates.length) return publish();
    const snapshots = await Promise.all(candidates.map(async candidate => {
      try {
        const [accounts, chainId] = await Promise.all([candidate.request({ method: 'eth_accounts' }), candidate.request({ method: 'eth_chainId' })]);
        return { candidate, address: accounts[0] || null, chainId };
      } catch (_) { return null; }
    }));
    const available = snapshots.filter(Boolean);
    const selected = available.find(item => item.address && network(item.chainId)) || available.find(item => item.address) || available[0];
    if (!selected) return publish();
    activeProvider = selected.candidate;
    bindProvider(activeProvider);
    state.address = selected.address;
    state.chainId = selected.chainId;
    return publish();
  }
  async function connect() {
    if (!provider()) throw new Error('No compatible browser wallet was detected. Install or enable an EVM wallet, then reload.');
    const accounts = await provider().request({ method: 'eth_requestAccounts' });
    state.address = accounts[0] || null;
    state.chainId = await provider().request({ method: 'eth_chainId' });
    return publish();
  }
  async function switchNetwork(chainId) {
    const target = NETWORKS[chainId];
    if (!target) throw new Error('That network is not supported by this prototype.');
    if (!provider()) throw new Error('Connect a compatible browser wallet first.');
    try { await provider().request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] }); }
    catch (error) {
      const unrecognizedChain = error?.code === 4902 || /unrecognized chain|unknown chain|not added/i.test(error?.message || '');
      if (!unrecognizedChain) throw error;
      await provider().request({ method: 'wallet_addEthereumChain', params: [target] });
    }
    return refresh();
  }
  function bindProvider(candidate) {
    if (!candidate || candidate.__mandaBound) return;
    try { Object.defineProperty(candidate, '__mandaBound', { value: true }); } catch (_) {}
    candidate.on?.('accountsChanged', accounts => { state.address = accounts[0] || null; publish(); });
    candidate.on?.('chainChanged', chainId => { state.chainId = chainId; publish(); });
  }
  window.addEventListener('eip6963:announceProvider', event => {
    if (!announcedProviders.some(item => item.info.uuid === event.detail.info.uuid)) announcedProviders.push(event.detail);
    if (!activeProvider) activeProvider = event.detail.provider;
    bindProvider(event.detail.provider);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  bindProvider(window.ethereum);
  window.MandaWallet = { NETWORKS, connect, refresh, switchNetwork, shortAddress, getProvider: provider };
})();
