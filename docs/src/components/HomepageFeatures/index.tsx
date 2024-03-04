import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Easy to Setup",
    description: (
      <>
        Smocker is available either as a single static binary or as a Docker
        image. No dependencies are required.
      </>
    ),
  },
  {
    title: "Easy to Configure",
    description: (
      <>
        Smocker can be configured programatically through YAML files, or using
        the user interface. You can configure a whole mock environment with a
        single call!
      </>
    ),
  },
  {
    title: "Opinionated",
    description: (
      <>
        Smocker was designed to make it as easy as possible to write great mocks
        and tests. Smocker highlights configuration errors and helps you to fix
        them.
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="padding-horiz--md">
        <Heading as="h3" className={styles.featureHeading}>
          {title}
        </Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
