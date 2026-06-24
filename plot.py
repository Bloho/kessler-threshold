import matplotlib.pyplot as plt

density = [0.085,0.0875,0.09,0.0925,0.095,0.0975,0.1,0.1025,0.105,0.1075]

probability = [0.025,0.145,0.35,0.44,0.78,0.88,0.975,0.985,0.99,1.0]

plt.figure(figsize=(7,5))

plt.plot(
    density,
    probability,
    marker="o",
    linewidth=2,
)

plt.xlabel("Normalized Orbital Density")
plt.ylabel("Cascade Probability")
plt.title("Probability of Kessler Cascade vs Orbital Density")

plt.grid(True)

plt.xlim(0.084,0.108)
plt.ylim(0,1.05)

plt.tight_layout()

plt.savefig("figure8.pdf")
plt.savefig("figure8.png",dpi=600)

plt.show()