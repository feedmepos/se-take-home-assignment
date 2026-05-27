import { Image, Typography } from "antd";

import IMAGES from "@/assets";

const { Text } = Typography;

const HomeBrandBar = () => {
  return (
    <div className="home__brandbar">
      <div className="home__brandmark">
        <Image
          src={IMAGES.system_logo}
          preview={false}
          alt="McDonald's logo"
          className="home__brandlogo"
        />
      </div>
      <div className="home__brandcopy">
        <Text className="home__brandname">McDonald&apos;s</Text>
        <Text className="home__brandtag">Feedme SW Assignment</Text>
      </div>
    </div>
  );
};

export default HomeBrandBar;
