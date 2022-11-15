class VideoJsPlugin {
    constructor() {

    }

    dispose = jest.fn()
}

class VideoJs {
    getPlugin() {
        return VideoJsPlugin;
    }

    registerPlugin = jest.fn()
}


const mockedVideoJs = new VideoJs();
export default mockedVideoJs;
