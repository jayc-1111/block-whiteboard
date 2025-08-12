// Theme management
const backgrounds = {
    none: 'none',
    night: 'none',
    light: 'url("https://images.unsplash.com/photo-1707209857286-62b9be358128?q=80&w=3018&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    lollipop: 'url("https://images.unsplash.com/photo-1654358101344-b58696575d26?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    frutiger: 'url("https://images.unsplash.com/photo-1743220879914-14adc4afdaa3?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")',
    picnic: 'none'
};

function setBackground(theme) {
    if (theme === 'none') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
    } else if (theme === 'night') {
        document.body.classList.remove('light-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('night-mode');
    } else if (theme === 'light') {
        document.body.classList.remove('night-mode', 'frutiger-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('light-mode');
    } else if (theme === 'frutiger') {
        document.body.classList.remove('light-mode', 'night-mode', 'picnic-mode', 'with-background');
        document.body.classList.add('frutiger-mode');
        // Check hardware acceleration for glass-heavy theme
        if (typeof checkHardwareAcceleration === 'function' && !checkHardwareAcceleration()) {
            setTimeout(() => showHardwareAccelerationWarning(), 500);
        }
    } else if (theme === 'picnic') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'with-background');
        document.body.classList.add('picnic-mode');
        // Check hardware acceleration for glass-heavy theme
        if (typeof checkHardwareAcceleration === 'function' && !checkHardwareAcceleration()) {
            setTimeout(() => showHardwareAccelerationWarning(), 500);
        }
    } else if (theme === 'lollipop') {
        document.body.classList.remove('light-mode', 'night-mode', 'frutiger-mode', 'picnic-mode');
        document.body.classList.add('with-background');
    }
    
    const root = document.documentElement;
    root.style.setProperty('--bg-image', backgrounds[theme] || backgrounds.none);
    
    const bgOptions = document.querySelectorAll('.bg-option');
    bgOptions.forEach(opt => opt.classList.remove('active'));
    const activeOption = [...bgOptions].find(opt => 
        opt.textContent.toLowerCase().includes(theme === 'none' ? 'default' : theme)
    );
    if (activeOption) activeOption.classList.add('active');
}
