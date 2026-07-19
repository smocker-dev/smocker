export const defaultResponseStatus = 200;

export const unaryMatchers = ["ShouldBeEmpty", "ShouldNotBeEmpty"];

export const positiveMatchers = [
  "ShouldEqual",
  "ShouldMatch",
  "ShouldEqualJSON",
  "ShouldContainSubstring",
  "ShouldStartWith",
  "ShouldEndWith",
  "ShouldResemble",
  "ShouldAlmostEqual",
  "ShouldBeEmpty",
];

export const negativeMatchers = [
  "ShouldNotEqual",
  "ShouldNotMatch",
  "ShouldNotContainSubstring",
  "ShouldNotStartWith",
  "ShouldNotEndWith",
  "ShouldNotResemble",
  "ShouldNotAlmostEqual",
  "ShouldNotBeEmpty",
];

// Grouped options covering every matcher of the mock format, for any matcher <Select>.
export const matcherOptions = [
  {
    label: "Positive",
    options: positiveMatchers.map((matcher) => ({
      value: matcher,
      label: matcher,
    })),
  },
  {
    label: "Negative",
    options: negativeMatchers.map((matcher) => ({
      value: matcher,
      label: matcher,
    })),
  },
];
