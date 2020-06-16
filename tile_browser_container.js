'use strict';

const e = React.createElement;

class TileBrowserContainer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            startX: 0,
            startY: 0,
            xLen: 200,
            yLen: 200
        };
    }

    render() {
        if (this.state.liked) {
            return this.state.startX + ',' + this.state.startY ;
        }

        return e(
            'button',
            { onClick: () => this.setState({ liked: true }) },
            'Start Co-ords'
        );
    }
}

const domContainer = document.querySelector('#tile_browser_container');
ReactDOM.render(e(TileBrowserContainer), domContainer);