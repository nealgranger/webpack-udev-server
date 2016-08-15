import {createElement} from 'react';
import map from 'lodash/fp/map';
import values from 'lodash/fp/values';
import {connect} from 'react-redux';

const Asset = ({name}) => (
  <li>{name}</li>
);

const Assets = ({assets}) => (
  <ul>
    {map((asset) => <Asset {...asset} key={asset.name}/>, assets)}
  </ul>
);

const StatsItem = (({token, hash, assets, publicPath}) => (
  <div>
    webpack {token} - {hash} - {publicPath}
    <Assets assets={assets}/>
  </div>
));

const List = (({stats}) => {
  return (
    <div>
      {map((props) => <StatsItem {...props} key={props.token}/>, stats)}
    </div>
  );
});

const ConnectedList = connect(({stats}) => {
  return {stats: values(stats)};
})(List);

export default ConnectedList;
