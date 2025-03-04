// Service Worker Register 
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('../../assets/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);

            })
            .catch(err => {
                console.log('Service Worker registration failed:', err);

            });
    });
}